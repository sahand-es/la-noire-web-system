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
  borderRadiusLG: 12,
  boxShadow: '0 2px 8px rgba(44, 37, 32, 0.08)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

// const siderBg = '#CFC4B4'
// const headerBg = '#D8CEC0'

const siderBg = deskLightTokens.colorText
const headerBg = deskLightTokens.colorText
export { siderBg }
export const siderTextColor = deskLightTokens.colorBgLayout
export const siderTextSecondary = deskLightTokens.colorBorder

/** Theme override for header/navbar content (light text on dark bg). Use via ConfigProvider. */
export const headerContentTheme = {
  token: {
    colorText: siderTextColor,
    colorTextSecondary: siderTextSecondary,
    colorLink: siderTextColor,
    colorPrimary: siderTextColor,
    colorPrimaryHover: deskLightTokens.colorBgContainer,
  },
  components: {
    Button: {
      defaultColor: siderTextColor,
      defaultBg: 'transparent',
      defaultBorderColor: 'transparent',
      defaultHoverBg: 'rgba(245, 237, 228, 0.08)',
      defaultHoverColor: deskLightTokens.colorBgContainer,
      defaultHoverBorderColor: 'transparent',
      textTextColor: siderTextColor,
      textHoverBg: 'rgba(245, 237, 228, 0.08)',
    },
    Breadcrumb: {
      itemColor: siderTextColor,
      lastItemColor: siderTextColor,
      linkColor: siderTextColor,
      linkHoverColor: deskLightTokens.colorBgContainer,
      separatorColor: siderTextSecondary,
    },
  },
}

export const antdTheme = {
  token: deskLightTokens,
  components: {
    Layout: {
      siderBg,
      headerBg,
      headerPadding: "0 24px 0 8px",
      headerColor: siderTextColor,
      triggerBg: siderBg,
      triggerColor: siderTextSecondary,
      lightSiderBg: siderBg,
      lightTriggerBg: siderBg,
      lightTriggerColor: siderTextSecondary,
      bodyBg: siderBg,
    },
    Menu: {
      darkItemColor: siderTextColor,
      darkItemSelectedColor: deskLightTokens.colorBgLayout,
      darkItemHoverColor: siderTextColor,
      darkSubMenuItemColor: siderTextSecondary,
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(245, 237, 228, 0.12)',
      darkItemHoverBg: 'rgba(245, 237, 228, 0.06)',
      darkSubMenuItemBg: deskLightTokens.siderBg,
      darkPopupBg: deskLightTokens.colorPrimary,
      itemColor: siderTextColor,
      itemSelectedColor: deskLightTokens.colorBgLayout,
      itemHoverColor: siderTextColor,
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(245, 237, 228, 0.12)',
      subMenuItemBg: 'transparent',
      subMenuItemColor: siderTextSecondary,
    },
    Card: {
      colorBorderSecondary: deskLightTokens.colorBorder,
    },
  },
}
