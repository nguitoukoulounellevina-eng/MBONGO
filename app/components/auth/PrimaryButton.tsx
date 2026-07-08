import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { C } from './constants';
import { Spacing, Radius } from '@/constants/spacing';

interface PrimaryButtonProps {
  onPress: () => void;
  label: string;
  loading?: boolean;
  disabled?: boolean;
}

export default function PrimaryButton({ onPress, label, loading, disabled }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[s.btn, (loading || disabled) && { opacity: 0.75 }]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={loading || disabled}
    >
      {loading
        ? <ActivityIndicator color={C.white} />
        : <Text style={s.txt}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: C.dark,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  txt: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
