import { ConfigProvider, Layout } from "antd";
import { headerContentTheme } from "../theme";

const { Header } = Layout;

export function Navbar({ start, end }) {
  return (
    <Header className="flex items-center justify-between pl-0 pr-6 shrink-0">
      <ConfigProvider theme={headerContentTheme}>
        <div className="flex items-center gap-3 min-w-0">{start}</div>
        {end}
      </ConfigProvider>
    </Header>
  );
}
