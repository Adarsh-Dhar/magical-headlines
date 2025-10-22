import { NextResponse } from "next/server"
import openApiSpec from "../openapi.json"

/**
 * OpenAPI Specification Endpoint
 * 
 * Serves the OpenAPI 3.0 specification for the Magical Headlines API.
 * This endpoint allows tools to auto-discover the API specification
 * and enables code generation for client SDKs.
 */
export async function GET() {
  try {
    return NextResponse.json(openApiSpec, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3600, s-maxage=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error("Error serving OpenAPI spec:", error)
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to load API specification"
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}
