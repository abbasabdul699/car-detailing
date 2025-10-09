import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Verify the conversation belongs to this detailer
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        detailerId: session.user.id
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Delete all messages in the conversation
    await prisma.message.deleteMany({
      where: {
        conversationId: conversationId
      }
    });

    // Optionally, you can also delete the conversation itself
    // Uncomment the next line if you want to delete the entire conversation
    // await prisma.conversation.delete({ where: { id: conversationId } });

    console.log(`Cleared conversation ${conversationId} for detailer ${session.user.id}`);

    return NextResponse.json({ success: true, message: 'Conversation cleared successfully' });

  } catch (error) {
    console.error('Error clearing conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
