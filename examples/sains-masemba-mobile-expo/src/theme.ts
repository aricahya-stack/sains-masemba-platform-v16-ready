import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  background: '#F2F3F7',
  text: '#15203A',
  muted: '#748097',
  blue: '#6C8EF5',
  mint: '#7EDCB5',
  lavender: '#A38CF4',
  peach: '#FFB87A',
  rose: '#F58B9B',
  shadowDark: '#C8CBD2',
  white: '#FFFFFF',
};

export function raisedShadow(depth = 10): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#9DA3AE',
      shadowOffset: { width: depth * 0.6, height: depth * 0.6 },
      shadowOpacity: 0.24,
      shadowRadius: depth,
    },
    android: { elevation: Math.max(3, Math.round(depth * 0.65)) },
    default: {},
  }) ?? {};
}

export function softHighlight(depth = 8): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: -depth * 0.5, height: -depth * 0.5 },
      shadowOpacity: 0.9,
      shadowRadius: depth,
    },
    default: {},
  }) ?? {};
}
