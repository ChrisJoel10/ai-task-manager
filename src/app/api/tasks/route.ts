import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/utils/embeddings';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, due_at, range_start, range_end, status } = body;

    const textToEmbed = `${name} ${description || ''}`;
    const embedding = await generateEmbedding(textToEmbed);

    const { data, error } = await supabase
        .from('tasks')
        .insert([
            {
                user_id: user.id,
                name,
                description,
                due_at,
                range_start,
                range_end,
                status: status || 'pending',
                embedding,
            },
        ])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, due_at, range_start, range_end, status } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (due_at !== undefined) updates.due_at = due_at;
    if (range_start !== undefined) updates.range_start = range_start;
    if (range_end !== undefined) updates.range_end = range_end;
    if (status !== undefined) updates.status = status;

    if (name || description) {
        // If name or description changed, regenerate embedding
        // We need to fetch the current task to get the other field if one is missing
        // But for simplicity, let's assume if we update one, we might want to re-embed based on what we have.
        // Better: fetch existing task if needed.
        // Optimization: Just use what's provided or empty string if it's a partial update that replaces the content.
        // Actually, to do it right, we should probably fetch the current task if we only have one of them.
        // But let's keep it simple: If name is updated, use new name + (new desc OR old desc).
        // For now, let's just embed what we have if name is present.

        // Fetch current task to get full text for embedding
        const { data: currentTask } = await supabase.from('tasks').select('name, description').eq('id', id).single();

        if (currentTask) {
            const newName = name !== undefined ? name : currentTask.name;
            const newDesc = description !== undefined ? description : currentTask.description;
            const textToEmbed = `${newName} ${newDesc || ''}`;
            updates.embedding = await generateEmbedding(textToEmbed);
        }
    }

    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (query) {
        // Semantic search
        const embedding = await generateEmbedding(query);
        const { data, error } = await supabase.rpc('match_tasks', {
            query_embedding: embedding,
            match_threshold: 0.5, // Adjust as needed
            match_count: 10,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    } else {
        // Standard list (could keep existing client-side logic for this, or move here)
        // For now, let's just return all tasks ordered by creation
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    }
}
