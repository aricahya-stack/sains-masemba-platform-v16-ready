import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, raisedShadow, softHighlight } from './theme';

type IconName = keyof typeof Ionicons.glyphMap;

type QuickAction = {
  label: string;
  icon: IconName;
  color: string;
};

type Activity = {
  title: string;
  subtitle: string;
  time: string;
  points: string;
  icon: IconName;
  color: string;
};

const quickActions: QuickAction[] = [
  { label: 'Belajar', icon: 'book-outline', color: colors.blue },
  { label: 'Latihan', icon: 'checkbox-outline', color: colors.mint },
  { label: 'Tryout', icon: 'school-outline', color: colors.peach },
  { label: 'Hasil', icon: 'stats-chart-outline', color: colors.rose },
];

const activities: Activity[] = [
  { title: 'Materi: Bahan dan Perubahan', subtitle: 'Bab 5 • IPA SMP', time: '2 jam lalu', points: '+20', icon: 'book-outline', color: colors.blue },
  { title: 'Kuis: Daya dan Gerakan', subtitle: 'Sains Tingkat 1', time: '5 jam lalu', points: '+15', icon: 'checkbox-outline', color: colors.mint },
  { title: 'Eksperimen: Ketumpatan Cair', subtitle: 'Sains Tingkat 2', time: '1 hari lalu', points: '+25', icon: 'flask-outline', color: colors.peach },
  { title: 'Diskusi: Hukum Newton', subtitle: 'Sains Tingkat 1', time: '2 hari lalu', points: '+10', icon: 'chatbubbles-outline', color: colors.lavender },
];

const tabs: ReadonlyArray<{ icon: IconName; label: string }> = [
  { icon: 'home', label: 'Beranda' },
  { icon: 'school-outline', label: 'Kelas' },
  { icon: 'book-outline', label: 'Modul' },
  { icon: 'stats-chart-outline', label: 'Aktivitas' },
  { icon: 'person-outline', label: 'Profil' },
];

function SoftSurface({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.softSurface, raisedShadow(10), softHighlight(8), style]}>{children}</View>;
}

function QuickActionButton({ item }: { item: QuickAction }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Buka ${item.label}`} activeOpacity={0.78} style={styles.quickActionWrap}>
      <SoftSurface style={styles.quickActionCircle}>
        <Ionicons name={item.icon} size={25} color={item.color} />
      </SoftSurface>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="Dashboard Sains Masemba"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Sains Masemba</Text>
            <Text style={styles.greeting}>Selamat datang kembali,</Text>
            <Text style={styles.userName}>Cikgu Aimi 👋</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Buka profil" activeOpacity={0.8}>
            <SoftSurface style={styles.avatar}>
              <Text style={styles.avatarText}>CA</Text>
            </SoftSurface>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#E0E5FF', '#F0ECFF', '#F2F3F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.balanceCard, raisedShadow(14)]}
        >
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIcon}>
              <Ionicons name="flask-outline" size={24} color={colors.blue} />
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Buka ringkasan belajar" style={styles.chevronButton}>
              <Ionicons name="chevron-forward" size={21} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceLabel}>Poin belajar Anda</Text>
          <Text style={styles.balanceValue}>1.248</Text>
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={18} color="#23B47E" />
            <Text style={styles.trendValue}>+85</Text>
            <Text style={styles.trendLabel}>dibanding bulan lalu</Text>
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          {quickActions.map((item) => <QuickActionButton key={item.label} item={item} />)}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktivitas terbaru</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Lihat semua aktivitas">
            <Text style={styles.sectionLink}>Lihat semua</Text>
          </TouchableOpacity>
        </View>

        <SoftSurface style={styles.activityCard}>
          {activities.map((item, index) => (
            <View key={item.title}>
              <View style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={21} color={item.color} />
                </View>
                <View style={styles.activityCopy}>
                  <Text numberOfLines={1} style={styles.activityTitle}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.activitySubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.activityMeta}>
                  <Text style={styles.points}>{item.points} ★</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </View>
              {index < activities.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </SoftSurface>
      </ScrollView>

      <View style={[styles.tabBar, raisedShadow(14), softHighlight(10)]} accessibilityRole="tablist">
        {tabs.map(({ icon, label }, index) => (
          <TouchableOpacity
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === 0 }}
            accessibilityLabel={label}
            style={[styles.tabButton, index === 0 && styles.tabButtonActive]}
          >
            <Ionicons name={icon} size={22} color={index === 0 ? colors.blue : colors.muted} />
            <Text style={[styles.tabLabel, index === 0 && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 126 },
  softSurface: { backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  brand: { color: colors.blue, fontSize: 13, fontWeight: '800', letterSpacing: 0.6, marginBottom: 16 },
  greeting: { color: colors.text, fontSize: 23, fontWeight: '800', letterSpacing: -0.6 },
  userName: { color: colors.muted, fontSize: 22, fontWeight: '700', marginTop: 3 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.blue, fontSize: 16, fontWeight: '900' },
  balanceCard: { borderRadius: 28, padding: 22, minHeight: 210, overflow: 'hidden' },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5FF' },
  chevronButton: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.45)' },
  balanceLabel: { marginTop: 20, color: colors.muted, fontSize: 15, fontWeight: '600' },
  balanceValue: { color: colors.text, fontSize: 46, fontWeight: '900', letterSpacing: -1.5, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  trendValue: { color: '#23B47E', fontSize: 16, fontWeight: '900' },
  trendLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, marginBottom: 30 },
  quickActionWrap: { width: '23%', alignItems: 'center' },
  quickActionCircle: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  sectionLink: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  activityCard: { borderRadius: 26, paddingHorizontal: 17, paddingVertical: 5 },
  activityRow: { minHeight: 83, flexDirection: 'row', alignItems: 'center' },
  activityIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, paddingHorizontal: 12 },
  activityTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  activitySubtitle: { color: colors.muted, fontSize: 11.5, fontWeight: '500', marginTop: 4 },
  activityMeta: { alignItems: 'flex-end', gap: 6 },
  points: { color: colors.lavender, fontSize: 11.5, fontWeight: '900' },
  activityTime: { color: colors.muted, fontSize: 10.5, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#D8DBE2', marginLeft: 58 },
  tabBar: { position: 'absolute', left: 14, right: 14, bottom: 12, minHeight: 78, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, backgroundColor: 'rgba(242,243,247,.97)' },
  tabButton: { minWidth: 58, minHeight: 57, alignItems: 'center', justifyContent: 'center', borderRadius: 20, gap: 4 },
  tabButtonActive: { backgroundColor: '#F2F3F7', ...raisedShadow(6) },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  tabLabelActive: { color: colors.blue },
});
