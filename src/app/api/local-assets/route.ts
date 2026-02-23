import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

const CATEGORIES = ['arm', 'back', 'chest', 'leg', 'shoulder']

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const assets: any[] = []

    if (category && CATEGORIES.includes(category)) {
      // Get assets for specific category
      const categoryPath = join(process.cwd(), 'public', 'assets', category)
      
      try {
        const files = await readdir(categoryPath)
        
        for (const file of files) {
          if (file.endsWith('.gif') || file.endsWith('.jpg') || file.endsWith('.png')) {
            const filePath = join(categoryPath, file)
            const fileStat = await stat(filePath)
            
            assets.push({
              filename: file,
              url: `/assets/${category}/${file}`,
              category,
              size: fileStat.size,
            })
          }
        }
      } catch (err) {
        // Directory doesn't exist, just return empty
        console.error(`Error reading directory ${categoryPath}:`, err)
      }
    } else {
      // Get all assets
      for (const cat of CATEGORIES) {
        const categoryPath = join(process.cwd(), 'public', 'assets', cat)
        
        try {
          const files = await readdir(categoryPath)
          
          for (const file of files) {
            if (file.endsWith('.gif') || file.endsWith('.jpg') || file.endsWith('.png')) {
              const filePath = join(categoryPath, file)
              const fileStat = await stat(filePath)
              
              assets.push({
                filename: file,
                url: `/assets/${cat}/${file}`,
                category: cat,
                size: fileStat.size,
              })
            }
          }
        } catch (err) {
          // Directory doesn't exist, skip
          console.error(`Error reading directory ${categoryPath}:`, err)
        }
      }
    }

    // Sort by category then filename
    assets.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.filename.localeCompare(b.filename)
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching local assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch local assets' },
      { status: 500 }
    )
  }
}