import { View, Text } from 'react-native';
import { colors, fonts } from '../../src/theme';

export default function ProfileTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.headlineItalic, fontSize: 24, color: colors.ink }}>
        Profile coming soon.
      </Text>
    </View>
  );
}
