import { getWebProject, updateWebProject } from '@/lib/query';
import { NextRequest, NextResponse } from 'next/server';
import { deployHtmlToDomain } from '@/lib/domain';

const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

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
    const { versionIndex } = body;
    if (
      typeof versionIndex !== 'number' ||
      !Array.isArray(project.htmlVersions) ||
      versionIndex < 0 ||
      versionIndex >= project.htmlVersions.length
    ) {
      return NextResponse.json({ error: 'Invalid versionIndex' }, { status: 400 });
    }
    const htmlVersion = project.htmlVersions[versionIndex];
    const htmlContent = htmlVersion.htmlContent;
    const domain = project.domain;
    if (!domain) {
      return NextResponse.json({ error: 'Project does not have a domain' }, { status: 400 });
    }
    await deployHtmlToDomain(domain, htmlContent);
    updateWebProject(id, { currentHtmlIndex: versionIndex });
    return NextResponse.json({
      success: true,
      url: `https://${domain}`,
      domain,
      versionIndex,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during deployment',
    }, { status: 500 });
  }
} 