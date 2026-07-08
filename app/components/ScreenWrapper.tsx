import React from 'react';
import { View, type ViewStyle } from 'react-native';

export const TAB_BAR_BOTTOM_MARGIN = 24;
export const TAB_BAR_HEIGHT = 65;
/** Distance from screen bottom to top of the tab bar */
export const TAB_BAR_TOP = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN;
/** Bottom value for FABs to sit above the tab bar */
export const FAB_BOTTOM = TAB_BAR_TOP + 16;

export function ScreenWrapper({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return (
    <View style={[{ flex: 1, paddingBottom: FAB_BOTTOM }, style]}>
      {children}
    </View>
  );
}
