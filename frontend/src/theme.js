/**
 * Ant Design theme aligned with desk-light CSS variables.
 * Single source of truth: same palette as :root[data-theme="desk-light"] in index.css.
 */
export const deskLightTokens = {
  colorPrimary: '#A37B2C',
  colorPrimaryHover: '#B48733',
  colorPrimaryActive: '#7F5F21',
  colorSuccess: '#2F7D57',
  colorWarning: '#C47A2C',
  colorError: '#9A3A3A',
  colorInfo: '#2D6C62',
  colorLink: '#2D6C62',
  colorText: '#231F18',
  colorTextSecondary: '#6A6054',
  colorTextTertiary: '#948A7E',
  colorBorder: '#E2D6C8',
  colorBgContainer: '#FBF6EE',
  colorBgLayout: '#F7F1E8',
  colorBgElevated: '#F3EBDD',
  borderRadius: 6,
  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.10)',
}

export const antdTheme = {
  token: deskLightTokens,
}
