export const colors = {
  // GarlicMonkey design tokens
  background: '#f7f7f7',
  panel: '#ffffff',
  accent: '#ffb22c',
  ink: '#854836',
  inkSoft: '#a67a68',
  locked: '#c9b8af',
  border: '#854836',
  white: '#ffffff',

  // Backward-compat aliases used throughout existing screens
  foreground: '#854836',
  muted: '#a67a68',
  card: '#ffffff',
  mint: '#ffb22c',      // mapped to accent for active states
  mintDark: '#e09a20',
  peach: '#ffb22c',
  sky: '#ffb22c',
  lavender: '#c9b8af',
  golden: '#ffb22c',
}

export const radius = { sm: 16, md: 24, lg: 32 }

export const shadows = {
  accent: {
    shadowColor: '#ffb22c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  ink: {
    shadowColor: '#854836',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  // Backward-compat aliases
  mint: {
    shadowColor: '#ffb22c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  peach: {
    shadowColor: '#ffb22c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  golden: {
    shadowColor: '#ffb22c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
}
