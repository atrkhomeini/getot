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
    // Using the correct API endpoint
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

    const data = await response.json()

    // The API returns an array of exercises with GIF URLs
    // Map them to the format our app expects
    const exercises = data.map((exercise: any) => ({
      id: exercise.id || Math.random().toString(),
      name: exercise.name || exercise.title || '',
      gifUrl: exercise.gifUrl || exercise.gifUrl || exercise.gif_url || '',
      images: exercise.images || [],
      videos: exercise.videos || [],
    }))

    return NextResponse.json(exercises)
  } catch (error) {
    console.error('Error searching exercises:', error)
    return NextResponse.json(
      { error: 'Failed to search exercises' },
      { status: 500 }
    )
  }
}