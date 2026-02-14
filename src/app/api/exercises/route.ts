import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const muscle = searchParams.get('muscle')
  const name = searchParams.get('name')

  try {
    let url = 'https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1/exercises'
    const params = new URLSearchParams()

    if (muscle) {
      params.append('muscleTargeted', muscle)
    }
    if (name) {
      params.append('name', name)
    }

    if (params.toString()) {
      url += `?${params.toString()}`
    }

    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': process.env.EXERCISEDB_API_KEY || '',
        'x-rapidapi-host': 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch exercises from ExerciseDB')
    }

    const result = await response.json()
    
    // Handle the response structure
    const exercises = result.data || (Array.isArray(result) ? result : [])

    // Map to our expected format
    const mappedExercises = exercises.map((exercise: any) => {
      // Use low quality (360p)
      const imageUrl = exercise.imageUrls?.['360p'] || 
                       exercise.imageUrl || ''
      
      return {
        id: exercise.exerciseId,
        name: exercise.name,
        gifUrl: imageUrl,
        imageUrl: imageUrl,
        imageUrls: exercise.imageUrls,
        videos: exercise.videos || [],
        muscle: exercise.muscleTargeted || exercise.primaryMuscles || [],
      }
    })

    return NextResponse.json(mappedExercises.slice(0, 20))
  } catch (error) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    )
  }
}