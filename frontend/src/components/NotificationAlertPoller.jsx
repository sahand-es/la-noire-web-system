import { useEffect, useRef } from "react";
import { App, Button } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { listNotifications } from "../api/notifications";

const POLL_INTERVAL_MS = 5000;

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  return [];
}

export function NotificationAlertPoller() {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const seenIdsRef = useRef(new Set());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    async function checkForNew() {
      try {
        const data = await listNotifications({ page: 1, pageSize: 20 });
        const rows = normalizeList(data);

        if (!isInitializedRef.current) {
          rows.forEach((r) => seenIdsRef.current.add(r.id));
          isInitializedRef.current = true;
          return;
        }

        const newUnread = rows.filter(
          (r) => !seenIdsRef.current.has(r.id) && !r.read_at,
        );

        for (const n of newUnread) {
          seenIdsRef.current.add(n.id);
          const summary = n.message || "New notification";
          const typeLabel = n.type ? `[${n.type}] ` : "";

          notification.info({
            message: "New notification",
            description: (
              <div className="flex flex-col gap-1">
                <span>
                  {typeLabel}
                  {summary.length > 80 ? `${summary.slice(0, 80)}…` : summary}
                </span>
                <Button
                  type="link"
                  size="small"
                  className="p-0 h-auto w-fit"
                  onClick={() => navigate("/notifications")}
                >
                  View all notifications →
                </Button>
              </div>
            ),
            icon: <BellOutlined />,
            placement: "topRight",
            duration: 6,
          });
        }
      } catch {
        // Silent fail; don't bother user with poll errors
      }
    }

    const id = setInterval(checkForNew, POLL_INTERVAL_MS);
    checkForNew();

    return () => clearInterval(id);
  }, [notification, navigate]);

  return null;
}
