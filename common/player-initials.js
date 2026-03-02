/**
 * Player initials for leaderboards. Shared across all sports (golf, etc.).
 * Storage: localStorage key betterseason_player_initials. Max 2 letters, uppercase, letters only.
 */
(function () {
  const STORAGE_KEY = 'betterseason_player_initials';
  const MAX_LENGTH = 2;

  function normalize(value) {
    if (value == null || typeof value !== 'string') return '';
    var letters = value.trim().replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, MAX_LENGTH);
    return letters;
  }

  function getInitials() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var n = normalize(raw);
      return n || null;
    } catch (e) {
      return null;
    }
  }

  function setInitials(value) {
    var n = normalize(value);
    if (!n) return false;
    try {
      localStorage.setItem(STORAGE_KEY, n);
      return true;
    } catch (e) {
      return false;
    }
  }

  function hasInitials() {
    return !!getInitials();
  }

  function validate(value) {
    var n = normalize(value);
    if (n.length === 0) return { valid: false, message: 'Enter 2 letters.' };
    if (n.length > MAX_LENGTH) return { valid: false, message: 'Max 2 letters.' };
    return { valid: true, normalized: n };
  }

  window.PlayerInitials = {
    STORAGE_KEY: STORAGE_KEY,
    getInitials: getInitials,
    setInitials: setInitials,
    hasInitials: hasInitials,
    validate: validate,
    MAX_LENGTH: MAX_LENGTH
  };
})();
