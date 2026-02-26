type ParsedGoogleFontsInput = {
  sourceUrl: string
  cssUrl: string
  families: string[]
  primaryFamily: string | null
}

function extractSpecimenUrlCandidate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const unescaped = trimmed.replace(/&amp;/g, '&')
  const directMatch = unescaped.match(/https?:\/\/fonts\.google\.com\/specimen\/[^\s"'()<>]+/iu)
  return directMatch?.[0] ?? unescaped
}

function normalizeFamily(rawFamily: string): string | null {
  const family = decodeURIComponent(rawFamily).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim()
  return family.length > 0 ? family : null
}

function encodeFamilyForGoogleFonts(family: string): string {
  return encodeURIComponent(family).replace(/%20/g, '+')
}

export function parseGoogleFontsInput(value: string): ParsedGoogleFontsInput | null {
  const candidate = extractSpecimenUrlCandidate(value)
  if (!candidate) {
    return null
  }

  try {
    const url = new URL(candidate)
    if (url.hostname !== 'fonts.google.com') {
      return null
    }

    const specimenMatch = url.pathname.match(/^\/specimen\/([^/?#]+)/u)
    const rawFamily = specimenMatch?.[1]
    if (!rawFamily) {
      return null
    }

    const family = normalizeFamily(rawFamily)
    if (!family) {
      return null
    }

    const encodedFamily = encodeFamilyForGoogleFonts(family)
    return {
      sourceUrl: `https://fonts.google.com/specimen/${encodedFamily}`,
      cssUrl: `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`,
      families: [family],
      primaryFamily: family,
    }
  } catch {
    return null
  }
}
