import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const START_MINUTES = 7 * 60;
const END_MINUTES = 17 * 60;
const SLOT_MINUTES = 5;
const PX_PER_MINUTE = 2;
const TIMELINE_HEIGHT = (END_MINUTES - START_MINUTES) * PX_PER_MINUTE;
const DEFAULT_DURATION = 30;
const MIN_DURATION = 10;
const MAX_DURATION = 60;

const categories = [
  { name: 'Health', color: '#2f80ed', activities: ['Walk', 'Swim', 'Stretch'] },
  { name: 'Lead Generation', color: '#e63946', activities: ['Circle Prospecting', 'Follow-up Calls'] },
  { name: 'Active Listings', color: '#2ea44f', activities: ['SkySlope', 'Photos', 'Flyers', 'MLS Upload', 'Client Update', 'Closing'] },
  { name: 'Listing Presentation', color: '#8b5cf6', activities: ['CMA', 'Listing Strategy', 'Listing Paperwork', 'Listing Presentation'] },
  { name: 'Growth', color: '#d6a21d', activities: ['Brandon Coaching', 'Office Meeting', 'Continuing Education'] },
  { name: 'Isaiah', color: '#67c7ff', activities: ['Read', 'Write', 'LEGO', 'Outside', 'Chores', 'Music'] },
  { name: 'Admin', color: '#8b949e', activities: ['Email', 'Calendar', 'Phone Calls', 'Miscellaneous', 'Drive Time'] },
];

const ghostSchedule = [
  { start: '7:00', end: '8:00', label: 'Prayer / Coffee / Stretch' },
  { start: '8:00', end: '9:00', label: 'Walk' },
  { start: '9:00', end: '9:30', label: 'Email / Calendar' },
  { start: '9:30', end: '11:30', label: 'Circle Prospecting' },
  { start: '11:30', end: '12:00', label: 'Lunch' },
  { start: '12:00', end: '13:00', label: 'Follow-up Calls' },
  { start: '13:15', end: '14:15', label: 'Swim' },
  { start: '14:15', end: '14:45', label: 'Review / Plan Tomorrow' },
  { start: '14:45', end: '17:00', label: 'Flexible\n(Listings / Appointments / Admin / Family)' },
];

function parseTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours24 % 12 || 12}:${String(minutes).padStart(2, '0')}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatClock(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function snapToFiveMinutes(y) {
  const snappedMinutes = Math.round(y / (SLOT_MINUTES * PX_PER_MINUTE)) * SLOT_MINUTES;
  return Math.min(END_MINUTES - MIN_DURATION, Math.max(START_MINUTES, START_MINUTES + snappedMinutes));
}

function buildHalfHourMarks() {
  const marks = [];
  for (let minute = START_MINUTES; minute <= END_MINUTES; minute += 30) {
    marks.push(minute);
  }
  return marks;
}

function ActivityTile({ activity, category, onDrop }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setDragging] = useState(false);

  const responder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDragging(true);
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_event, gesture) => {
        setDragging(false);
        pan.flattenOffset();
        onDrop({ activity, category, gesture });
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    }),
    [activity, category, onDrop, pan],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.activityTile,
        { borderColor: category.color, transform: pan.getTranslateTransform(), zIndex: isDragging ? 30 : 1 },
      ]}
    >
      <Text style={styles.activityText}>{activity}</Text>
    </Animated.View>
  );
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [expandedCategoryName, setExpandedCategoryName] = useState('Health');
  const [placedTiles, setPlacedTiles] = useState([]);
  const [activeTileId, setActiveTileId] = useState(null);
  const timelinePageY = useRef(0);
  const halfHourMarks = useMemo(buildHalfHourMarks, []);
  const expandedCategory = categories.find((category) => category.name === expandedCategoryName) ?? categories[0];
  const activeTile = placedTiles.find((tile) => tile.id === activeTileId);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function addTileFromDrop({ activity, category, gesture }) {
    const localY = gesture.moveY - timelinePageY.current;
    if (localY < -40 || localY > TIMELINE_HEIGHT + 40) return;

    const start = snapToFiveMinutes(localY);
    setPlacedTiles((currentTiles) => [
      ...currentTiles,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: activity,
        category: category.name,
        color: category.color,
        start,
        duration: DEFAULT_DURATION,
      },
    ]);
  }

  function changeDuration(delta) {
    if (!activeTileId) return;
    setPlacedTiles((currentTiles) => currentTiles.map((tile) => {
      if (tile.id !== activeTileId) return tile;
      return { ...tile, duration: Math.max(MIN_DURATION, Math.min(MAX_DURATION, tile.duration + delta)) };
    }));
  }

  function deleteActiveTile() {
    setPlacedTiles((currentTiles) => currentTiles.filter((tile) => tile.id !== activeTileId));
    setActiveTileId(null);
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Daily Rock</Text>
        <View style={styles.dateTime}>
          <Text style={styles.dateText}>{formatDate(now)}</Text>
          <Text style={styles.timeText}>{formatClock(now)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.timelineScroll} showsVerticalScrollIndicator={false}>
        <View
          style={styles.timeline}
          onLayout={(event) => {
            event.target.measure((_x, _y, _width, _height, _pageX, pageY) => {
              timelinePageY.current = pageY;
            });
          }}
        >
          {halfHourMarks.map((minute) => (
            <React.Fragment key={minute}>
              <Text style={[styles.timeLabel, { top: (minute - START_MINUTES) * PX_PER_MINUTE - 9 }]}>{formatTime(minute)}</Text>
              <View style={[styles.gridLine, { top: (minute - START_MINUTES) * PX_PER_MINUTE }]} />
            </React.Fragment>
          ))}

          {Array.from({ length: (END_MINUTES - START_MINUTES) / SLOT_MINUTES + 1 }, (_, index) => (
            <View key={`tick-${index}`} style={[styles.fiveMinuteTick, { top: index * SLOT_MINUTES * PX_PER_MINUTE }]} />
          ))}

          {ghostSchedule.map((item) => {
            const start = parseTime(item.start);
            const end = parseTime(item.end);
            return (
              <View
                key={`${item.start}-${item.label}`}
                pointerEvents="none"
                style={[
                  styles.ghostBlock,
                  { top: (start - START_MINUTES) * PX_PER_MINUTE, height: (end - start) * PX_PER_MINUTE },
                ]}
              >
                <Text style={styles.ghostText}>{item.label}</Text>
              </View>
            );
          })}

          {placedTiles.map((tile) => (
            <Pressable
              key={tile.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${tile.name}`}
              onPress={() => setActiveTileId(tile.id)}
              style={[
                styles.placedTile,
                {
                  top: (tile.start - START_MINUTES) * PX_PER_MINUTE,
                  height: tile.duration * PX_PER_MINUTE,
                  backgroundColor: tile.color,
                },
              ]}
            >
              <Text style={styles.placedTitle}>{tile.name}</Text>
              <Text style={styles.placedTime}>{formatTime(tile.start)}–{formatTime(tile.start + tile.duration)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
          {categories.map((category) => {
            const isActive = category.name === expandedCategoryName;
            return (
              <Pressable
                key={category.name}
                onPress={() => setExpandedCategoryName(category.name)}
                style={[styles.categoryTab, isActive && { borderColor: category.color, shadowColor: category.color }]}
              >
                <Text style={styles.categoryText}>{category.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.panelTitle}>{expandedCategory.name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activities}>
          {expandedCategory.activities.map((activity) => (
            <ActivityTile key={activity} activity={activity} category={expandedCategory} onDrop={addTileFromDrop} />
          ))}
        </ScrollView>
      </View>

      {activeTile ? (
        <Pressable style={styles.popupBackdrop} onPress={() => setActiveTileId(null)}>
          <Pressable style={styles.editPopup} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.popupTitle}>{activeTile.name}</Text>
            <Pressable style={styles.popupButton} onPress={() => changeDuration(5)}><Text style={styles.popupButtonText}>+5</Text></Pressable>
            <Pressable style={styles.popupButton} onPress={() => changeDuration(-5)}><Text style={styles.popupButtonText}>-5</Text></Pressable>
            <Pressable style={[styles.popupButton, styles.deleteButton]} onPress={deleteActiveTile}><Text style={styles.popupButtonText}>Delete</Text></Pressable>
            <Pressable style={styles.popupButton} onPress={() => setActiveTileId(null)}><Text style={styles.popupButtonText}>Done</Text></Pressable>
          </Pressable>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#07090d' },
  header: {
    zIndex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(7, 9, 13, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#222938',
  },
  title: { color: '#f4f7fb', fontSize: 22, fontWeight: '800', letterSpacing: 0.4 },
  dateTime: { alignItems: 'flex-end', flexShrink: 1 },
  dateText: { color: '#c7d0de', fontSize: 12 },
  timeText: { color: '#f4f7fb', fontSize: 13, fontWeight: '700', marginTop: 2 },
  timelineScroll: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 220 },
  timeline: { alignSelf: 'center', width: '100%', maxWidth: 760, height: TIMELINE_HEIGHT, borderLeftWidth: 1, borderLeftColor: '#2b3342' },
  timeLabel: { position: 'absolute', width: 58, color: '#9aa6b5', fontSize: 12, textAlign: 'right' },
  gridLine: { position: 'absolute', left: 68, right: 0, height: 1, backgroundColor: 'rgba(148, 163, 184, 0.18)' },
  fiveMinuteTick: { position: 'absolute', left: 68, right: 0, height: 1, backgroundColor: 'rgba(148, 163, 184, 0.05)' },
  ghostBlock: { position: 'absolute', left: 74, right: 6, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(188, 198, 211, 0.16)', borderRadius: 10, backgroundColor: 'rgba(137, 148, 165, 0.055)' },
  ghostText: { color: 'rgba(213, 220, 230, 0.34)', fontSize: 13 },
  placedTile: { position: 'absolute', left: 78, right: 10, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  placedTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  placedTime: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginTop: 2 },
  categoryBar: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6, backgroundColor: 'rgba(10, 13, 19, 0.98)', borderTopWidth: 1, borderTopColor: '#252d3c', paddingTop: 10, paddingBottom: 14 },
  categoryTabs: { gap: 8, paddingHorizontal: 10, paddingBottom: 10 },
  categoryTab: { borderWidth: 1, borderColor: '#2b3342', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#151a24', shadowOpacity: 0.45, shadowRadius: 6 },
  categoryText: { color: '#d8dee8', fontSize: 12, fontWeight: '700' },
  panelTitle: { color: '#aeb8c7', fontSize: 12, marginBottom: 8, marginHorizontal: 10, alignSelf: 'center', width: '100%', maxWidth: 760 },
  activities: { gap: 8, paddingHorizontal: 10, paddingBottom: 2 },
  activityTile: { minWidth: 96, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 2, borderRadius: 14, backgroundColor: '#111720', alignItems: 'center', justifyContent: 'center' },
  activityText: { color: '#f4f7fb', fontWeight: '800', textAlign: 'center' },
  popupBackdrop: { position: 'absolute', inset: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  editPopup: { width: '85%', maxWidth: 300, flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14, borderWidth: 1, borderColor: '#374151', borderRadius: 18, backgroundColor: '#111720' },
  popupTitle: { width: '100%', color: '#f4f7fb', fontWeight: '800', fontSize: 16, marginBottom: 2 },
  popupButton: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderColor: '#3b4657', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#1b2330' },
  deleteButton: { backgroundColor: '#5f1d28', borderColor: '#8f2d3d' },
  popupButtonText: { color: '#f4f7fb', fontWeight: '800' },
});
