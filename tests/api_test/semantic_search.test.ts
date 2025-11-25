import { POST, GET } from "../../src/app/api/tasks/route";
import { NextRequest } from "next/server";
import { expect, test, vi, describe, beforeEach } from "vitest";

// Mock dependencies
const mockInsert = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: '123', name: 'Test Task' }, error: null });
const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert,
    select: mockSelect,
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
});
const mockRpc = vi.fn().mockResolvedValue({ data: [{ id: '123', similarity: 0.9 }], error: null });
const mockAuthGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } });

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockAuthGetUser },
        from: mockFrom,
        rpc: mockRpc,
    }),
}));

vi.mock("@/utils/embeddings", () => ({
    generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

describe("Semantic Search API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("POST /api/tasks creates task with embedding", async () => {
        const body = {
            name: "Buy milk",
            description: "Go to the store",
        };

        const req = new NextRequest("http://localhost/api/tasks", {
            method: "POST",
            body: JSON.stringify(body),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(data).toEqual({ id: '123', name: 'Test Task' });
        expect(mockFrom).toHaveBeenCalledWith('tasks');
        expect(mockInsert).toHaveBeenCalledWith([
            expect.objectContaining({
                name: "Buy milk",
                embedding: [0.1, 0.2, 0.3],
            }),
        ]);
    });

    test("GET /api/tasks?query=... performs semantic search", async () => {
        const req = new NextRequest("http://localhost/api/tasks?query=groceries", {
            method: "GET",
        });

        const res = await GET(req);
        const data = await res.json();

        expect(data).toEqual([{ id: '123', similarity: 0.9 }]);
        expect(mockRpc).toHaveBeenCalledWith('match_tasks', expect.objectContaining({
            query_embedding: [0.1, 0.2, 0.3],
            match_threshold: 0.5,
        }));
    });
});
