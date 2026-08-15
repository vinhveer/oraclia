/**
 * Source palettes. Each one overrides only the accent roles — surfaces,
 * outlines and error stay on the baseline scheme, which is how M3 dynamic
 * color behaves when a new source colour is applied.
 */
export interface AccentRoles {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiary: string
  onTertiary: string
  tertiaryContainer: string
  onTertiaryContainer: string
}

export interface Palette {
  id: string
  name: string
  /** Swatch shown in the picker. */
  seed: string
  light: AccentRoles
  dark: AccentRoles
}

export const palettes: Palette[] = [
  {
    id: 'violet',
    name: 'Violet',
    seed: '#6750a4',
    light: {
      primary: '#6750a4',
      onPrimary: '#ffffff',
      primaryContainer: '#eaddff',
      onPrimaryContainer: '#21005d',
      secondary: '#625b71',
      onSecondary: '#ffffff',
      secondaryContainer: '#e8def8',
      onSecondaryContainer: '#1d192b',
      tertiary: '#7d5260',
      onTertiary: '#ffffff',
      tertiaryContainer: '#ffd8e4',
      onTertiaryContainer: '#31111d',
    },
    dark: {
      primary: '#d0bcff',
      onPrimary: '#381e72',
      primaryContainer: '#4f378b',
      onPrimaryContainer: '#eaddff',
      secondary: '#ccc2dc',
      onSecondary: '#332d41',
      secondaryContainer: '#4a4458',
      onSecondaryContainer: '#e8def8',
      tertiary: '#efb8c8',
      onTertiary: '#492532',
      tertiaryContainer: '#633b48',
      onTertiaryContainer: '#ffd8e4',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    seed: '#00696d',
    light: {
      primary: '#00696d',
      onPrimary: '#ffffff',
      primaryContainer: '#6ff6fb',
      onPrimaryContainer: '#002021',
      secondary: '#4a6363',
      onSecondary: '#ffffff',
      secondaryContainer: '#cce8e7',
      onSecondaryContainer: '#051f1f',
      tertiary: '#4b607c',
      onTertiary: '#ffffff',
      tertiaryContainer: '#d3e4ff',
      onTertiaryContainer: '#041c35',
    },
    dark: {
      primary: '#4cd9df',
      onPrimary: '#003739',
      primaryContainer: '#004f52',
      onPrimaryContainer: '#6ff6fb',
      secondary: '#b0cccb',
      onSecondary: '#1b3534',
      secondaryContainer: '#324b4b',
      onSecondaryContainer: '#cce8e7',
      tertiary: '#b3c8e8',
      onTertiary: '#1c314b',
      tertiaryContainer: '#334863',
      onTertiaryContainer: '#d3e4ff',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    seed: '#815500',
    light: {
      primary: '#815500',
      onPrimary: '#ffffff',
      primaryContainer: '#ffddaf',
      onPrimaryContainer: '#291800',
      secondary: '#6f5b40',
      onSecondary: '#ffffff',
      secondaryContainer: '#fadebc',
      onSecondaryContainer: '#271904',
      tertiary: '#51643f',
      onTertiary: '#ffffff',
      tertiaryContainer: '#d3eabb',
      onTertiaryContainer: '#0f2003',
    },
    dark: {
      primary: '#feba4b',
      onPrimary: '#442b00',
      primaryContainer: '#623f00',
      onPrimaryContainer: '#ffddaf',
      secondary: '#ddc2a1',
      onSecondary: '#3e2d16',
      secondaryContainer: '#56442a',
      onSecondaryContainer: '#fadebc',
      tertiary: '#b7cea1',
      onTertiary: '#243515',
      tertiaryContainer: '#3a4c2a',
      onTertiaryContainer: '#d3eabb',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    seed: '#9c4146',
    light: {
      primary: '#9c4146',
      onPrimary: '#ffffff',
      primaryContainer: '#ffdad9',
      onPrimaryContainer: '#40000a',
      secondary: '#775656',
      onSecondary: '#ffffff',
      secondaryContainer: '#ffdad9',
      onSecondaryContainer: '#2c1516',
      tertiary: '#755a2f',
      onTertiary: '#ffffff',
      tertiaryContainer: '#ffdea7',
      onTertiaryContainer: '#281800',
    },
    dark: {
      primary: '#ffb3b2',
      onPrimary: '#5f131c',
      primaryContainer: '#7e2a30',
      onPrimaryContainer: '#ffdad9',
      secondary: '#e7bdbc',
      onSecondary: '#44292a',
      secondaryContainer: '#5d3f3f',
      onSecondaryContainer: '#ffdad9',
      tertiary: '#e5c18d',
      onTertiary: '#422c05',
      tertiaryContainer: '#5b421a',
      onTertiaryContainer: '#ffdea7',
    },
  },
]

const cssVarByRole: Record<keyof AccentRoles, string> = {
  primary: '--md-primary',
  onPrimary: '--md-on-primary',
  primaryContainer: '--md-primary-container',
  onPrimaryContainer: '--md-on-primary-container',
  secondary: '--md-secondary',
  onSecondary: '--md-on-secondary',
  secondaryContainer: '--md-secondary-container',
  onSecondaryContainer: '--md-on-secondary-container',
  tertiary: '--md-tertiary',
  onTertiary: '--md-on-tertiary',
  tertiaryContainer: '--md-tertiary-container',
  onTertiaryContainer: '--md-on-tertiary-container',
}

export function applyPalette(palette: Palette, dark: boolean) {
  const roles = dark ? palette.dark : palette.light
  const root = document.documentElement
  for (const [role, value] of Object.entries(roles)) {
    root.style.setProperty(cssVarByRole[role as keyof AccentRoles], value)
  }
}
