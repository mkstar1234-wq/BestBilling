export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    switch (type) {
      case 'light':
        window.navigator.vibrate(50);
        break;
      case 'medium':
        window.navigator.vibrate([50, 50, 50]);
        break;
      case 'heavy':
        window.navigator.vibrate([100, 50, 100]);
        break;
      case 'success':
        window.navigator.vibrate([50, 50, 100]);
        break;
      case 'error':
        window.navigator.vibrate([200, 100, 200]);
        break;
    }
  }
};
