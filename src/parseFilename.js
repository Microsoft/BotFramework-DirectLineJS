export default function parseFilename(filename) {
  if (!filename) {
      return {
          extname: '',
          name: ''
      };
  } else if (~filename.indexOf('.')) {
      const [extensionWithoutDot, ...nameSegments] = filename.split('.').reverse();

      return {
          extname: '.' + extensionWithoutDot,
          name: nameSegments.reverse().join('.')
      };
  } else {
      return {
          extname: '',
          name: filename
      };
  }
}
