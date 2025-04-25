import { getWebProject, addHtmlVersion, updateWebProject } from '@/lib/query';
import { NextRequest, NextResponse } from 'next/server';

// POST: Add a new HTML version
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    
    const project = getWebProject(id);
    if (!project) {
      return NextResponse.json({ error: 'WebProject not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { html } = body;
    
    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'Invalid HTML content' }, { status: 400 });
    }
    
    const versionId = await addHtmlVersion(id, html);
    const updatedProject = getWebProject(id);
    const newVersionIndex = updatedProject?.htmlVersions.length ? updatedProject.htmlVersions.length - 1 : 0;
    
    return NextResponse.json({
      success: true,
      versionId,
      versionIndex: newVersionIndex,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding HTML version:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error while adding HTML version',
    }, { status: 500 });
  }
}

// PUT: Update an existing HTML version
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    
    const project = getWebProject(id);
    if (!project) {
      return NextResponse.json({ error: 'WebProject not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { html, versionIndex } = body;
    
    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'Invalid HTML content' }, { status: 400 });
    }
    
    if (
      typeof versionIndex !== 'number' ||
      !Array.isArray(project.htmlVersions) ||
      versionIndex < 0 ||
      versionIndex >= project.htmlVersions.length
    ) {
      return NextResponse.json({ error: 'Invalid versionIndex' }, { status: 400 });
    }
    
    // Create a new version with the updated HTML
    const htmlVersions = [...project.htmlVersions];
    htmlVersions[versionIndex] = {
      ...htmlVersions[versionIndex],
      htmlContent: html,
      // Don't update createdAt to preserve the original timestamp
    };
    
    // Update the project
    updateWebProject(id, { htmlVersions });
    
    return NextResponse.json({
      success: true,
      versionIndex,
    });
  } catch (error) {
    console.error('Error updating HTML version:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error while updating HTML version',
    }, { status: 500 });
  }
} 