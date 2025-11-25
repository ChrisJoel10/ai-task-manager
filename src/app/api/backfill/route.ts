import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/utils/embeddings';

export async function GET(req: NextRequest) {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch tasks with no embedding
    // Note: .is('embedding', null) checks for NULL values
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, name, description')
        .is('embedding', null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
        return NextResponse.json({ message: 'No tasks to backfill' });
    }

    let count = 0;
    for (const task of tasks) {
        try {
            const text = `${task.name} ${task.description || ''}`;
            const embedding = await generateEmbedding(text);

            const { error: updateError } = await supabase
                .from('tasks')
                .update({ embedding })
                .eq('id', task.id);

            if (!updateError) {
                count++;
            }
        } catch (e) {
            console.error(`Failed to generate embedding for task ${task.id}`, e);
        }
    }

    return NextResponse.json({ message: `Successfully backfilled ${count} tasks` });
}
