import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/spacing';

interface TrendAlert {
  categorie_id: number;
  libelle: string;
  icone: string;
  couleur: string;
  montant_augmentation: number;
  pourcentage_augmentation: number;
  semaines_hausse: number;
  message: string;
}

interface Props {
  alertes: TrendAlert[];
  onPress: () => void;
  onDismiss?: () => void;
  colors: any;
}

export default function TrendAlertBanner({ alertes, onPress, onDismiss, colors }: Props) {
  const s = useMemo(() => StyleSheet.create({
    banner: {
      backgroundColor: '#FFF7ED',
      borderRadius: Radius.lg,
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
      padding: Spacing.md,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: '#92400E',
      marginBottom: 2,
    },
    desc: {
      fontSize: 11,
      color: '#A16207',
      lineHeight: 15,
    },
    closeBtn: {
      padding: 4,
      marginLeft: Spacing.sm,
    },
  }), [colors]);

  if (alertes.length === 0) return null;

  return (
    <TouchableOpacity style={s.banner} onPress={onPress} activeOpacity={0.7}>
      <View style={s.iconWrap}>
        <Ionicons name="trending-up" size={20} color="#F59E0B" />
      </View>
      <View style={s.content}>
        <Text style={s.title}>Tendance à surveiller</Text>
        <Text style={s.desc}>
          {alertes.length} catégorie{alertes.length > 1 ? 's' : ''} en hausse depuis {alertes[0].semaines_hausse} semaines. +{alertes[0].pourcentage_augmentation}% soit {new Intl.NumberFormat('fr-FR').format(alertes[0].montant_augmentation)} FCFA.
        </Text>
      </View>
      {onDismiss && (
        <TouchableOpacity style={s.closeBtn} onPress={onDismiss}>
          <Ionicons name="close" size={16} color="#92400E" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
