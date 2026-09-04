import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { C } from './theme';

export function Screen({ children, contentStyle }: { children: React.ReactNode; contentStyle?: ViewStyle }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ padding: 18, gap: 14, flexGrow: 1 }, contentStyle]}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, gap: 10, borderCurve: 'continuous' }, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text selectable style={{ color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 }}>{children}</Text>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text selectable style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text selectable style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{children}</Text>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text selectable style={{ color: C.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <TextInput
        placeholderTextColor="#607086"
        {...props}
        style={[{
          color: C.text,
          backgroundColor: C.panel2,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 13,
          paddingHorizontal: 13,
          paddingVertical: 12,
          fontSize: 16,
          borderCurve: 'continuous',
        }, props.style]}
      />
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled = false }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }) {
  const backgroundColor = variant === 'primary' ? C.blue2 : variant === 'danger' ? '#3A151B' : C.panel2;
  const color = variant === 'danger' ? '#FF8893' : C.text;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        backgroundColor,
        borderColor: variant === 'primary' ? '#3189ED' : C.border,
        borderWidth: 1,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 13,
        alignItems: 'center',
        borderCurve: 'continuous',
      })}
    >
      <Text selectable style={{ color, fontSize: 15, fontWeight: '800' }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? '#123761' : C.panel2, borderWidth: 1, borderColor: active ? '#2E83E3' : C.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
      <Text selectable style={{ color: active ? '#7FC0FF' : C.muted, fontWeight: '700', fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <View style={{ backgroundColor: '#2B1116', borderColor: '#6E2832', borderWidth: 1, padding: 12, borderRadius: 12 }}><Text selectable style={{ color: '#FF98A3' }}>{message}</Text></View>;
}
