import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    const url = `https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1/exercises/search?search=${encodeURIComponent(query)}`

    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': process.env.EXERCISEDB_API_KEY || '',
        'x-rapidapi-host': 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to search exercises from ExerciseDB')
    }

    const result = await response.json()
    
    // The API returns { success: true, data: [...] }
    const exercises = result.data || []

    // Map to the format our app expects
    const mappedExercises = exercises.map((exercise: any) => {
      // Use low quality (360p) to match API capabilities
      const imageUrl = exercise.imageUrls?.['360p'] || 
                       exercise.imageUrl || ''
      
      return {
        id: exercise.exerciseId,
        name: exercise.name,
        gifUrl: imageUrl, // Use low quality image
        imageUrl: imageUrl,
        imageUrls: exercise.imageUrls,
        videoUrl: exercise.videoUrl || '',
        // Store rich exercise data
        overview: exercise.overview || '',
        instructions: exercise.instructions || [],
        tips: exercise.exerciseTips || [],
        variations: exercise.variations || [],
        equipment: exercise.equipments || [],
        bodyParts: exercise.bodyParts || [],
        targetMuscles: exercise.targetMuscles || [],
        secondaryMuscles: exercise.secondaryMuscles || [],
      }
    })

    return NextResponse.json(mappedExercises)
  } catch (error) {
    console.error('Error searching exercises:', error)
    return NextResponse.json(
      { error: 'Failed to search exercises', details: String(error) },
      { status: 500 }
    )
  }
}