jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...props }) => React.createElement(Text, props, name);
  Icon.glyphMap = {};
  return { Ionicons: Icon };
});
