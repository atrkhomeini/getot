const ASSET_MAPPING: Record<string, string> = {
  // Arm exercises
  'barbell reverse wrist curl': '/assets/arm/barbell-reverse-wrist-curl.gif',
  'bicep curl': '/assets/arm/bicep-curl-cable.gif',
  'dumbbell curl': '/assets/arm/dumbell-curl.gif',
  'tricep extension': '/assets/arm/seated-dumbbell-triceps-extension.gif',
  
  // Back exercises
  'chin up': '/assets/back/chin-up.gif',
  'pull up': '/assets/back/pull-up.gif',
  'row': '/assets/back/machine-rowing.gif',
  'lat pulldown': '/assets/back/rope-pullover.gif',
  
  // Chest exercises
  'bench press': '/assets/chest/barbell-bench-press.gif',
  'incline press': '/assets/chest/incline-dumbell-press.gif',
  'dips': '/assets/chest/dips-bodyweight.gif',
  'chest press': '/assets/chest/machine-chest-press.gif',
  
  // Leg exercises
  'squat': '/assets/leg/hack-squat.gif',
  'deadlift': '/assets/leg/barbell-deadlift.gif',
  'leg press': '/assets/leg/leg-press.gif',
  'leg extension': '/assets/leg/leg-extension.gif',
  'hamstring curl': '/assets/leg/seated-hamstring-curl.gif',
  
  // Shoulder exercises
  'shoulder press': '/assets/shoulder/dumbbell-shoulder-press.gif',
  'lateral raise': '/assets/shoulder/dumbbell-side-lateral-raise.gif',
  'front raise': '/assets/shoulder/dumbell-front-raise.gif',
  'face pull': '/assets/shoulder/cable-face-pull.gif',
}

export function getAssetForExercise(exerciseName: string): string | null {
  const normalizedName = exerciseName.toLowerCase().trim()
  
  // Try exact match first
  if (ASSET_MAPPING[normalizedName]) {
    return ASSET_MAPPING[normalizedName]
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(ASSET_MAPPING)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value
    }
  }
  
  return null
}

export function getAllAssetsByCategory(category: string): string[] {
  const assets = Object.entries(ASSET_MAPPING)
    .filter(([_, path]) => path.includes(`/${category}/`))
    .map(([_, path]) => path)
  
  return assets
}