/**
 * Ant Design theme - classic L.A. Noire desk-light aesthetic.
 */
export const deskLightTokens = {
  colorPrimary: '#5C4A3D',
  colorPrimaryHover: '#6B5344',
  colorPrimaryActive: '#4A3B30',
  colorSuccess: '#2F7D57',
  colorWarning: '#8B6914',
  colorError: '#8B3A3A',
  colorInfo: '#2D6C62',
  colorLink: '#4A3B30',
  colorText: '#2C2520',
  colorTextSecondary: '#5C534A',
  colorTextTertiary: '#7A7268',
  colorBorder: '#D4C8B8',
  colorBgContainer: '#F5EDE4',
  colorBgLayout: '#EDE4D8',
  colorBgElevated: '#E8DED2',
  borderRadius: 4,
  boxShadow: '0 2px 8px rgba(44, 37, 32, 0.08)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const siderBg = '#CFC4B4'
const headerBg = '#D8CEC0'

export const antdTheme = {
  token: deskLightTokens,
  components: {
    Layout: {
      siderBg,
      headerBg,
      headerPadding: "0 24px 0 8px",
      headerColor: deskLightTokens.colorText,
      triggerBg: siderBg,
      triggerColor: deskLightTokens.colorTextSecondary,
      lightSiderBg: siderBg,
      lightTriggerBg: siderBg,
      lightTriggerColor: deskLightTokens.colorTextSecondary,
      bodyBg: deskLightTokens.colorBgLayout,
    },
    Menu: {
      itemColor: deskLightTokens.colorText,
      itemSelectedColor: deskLightTokens.colorPrimary,
      itemHoverColor: deskLightTokens.colorText,
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(92, 74, 61, 0.08)',
      subMenuItemBg: 'rgba(232, 222, 210, 0.5)',
    },
  },
}
