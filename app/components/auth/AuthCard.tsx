import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from './constants';
import { Spacing, Radius } from '@/constants/spacing';

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return <View style={s.card}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    marginHorizontal: Spacing.lg,
    borderRadius: 24,
    padding: Spacing.lg,
    marginTop: -Spacing.sm,
    shadowColor: '#0D0828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
});
