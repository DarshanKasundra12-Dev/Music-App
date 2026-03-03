import { Platform } from 'react-native';

const base = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'system-ui, -apple-system, sans-serif',
});

export const fonts = {
  regular: base,
  semiBold: base,
  bold: base,
  extraBold: base,
};

export const fontWeights = {
  regular: '400' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};
