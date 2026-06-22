const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
    console.log("Testing Profiles query...");
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, nickname, username, avatar_url, bio, is_professional_mode, headline, tags, open_for_collab, is_private')
            .or('is_private.is.null,is_private.eq.false')
            .limit(20);
        if (error) {
            console.error("Profiles error:", error);
        } else {
            console.log("Profiles count:", data.length);
        }
    } catch (e) {
        console.error("Profiles exception:", e);
    }

    console.log("Testing Groups & Channels query...");
    try {
        const { data, error } = await supabase
            .from('groups_channels')
            .select('id, name, username, avatar_url, description, type, creator_id, created_at')
            .eq('is_public', true)
            .limit(20);
        if (error) {
            console.error("Groups error:", error);
        } else {
            console.log("Groups count:", data.length);
        }
    } catch (e) {
        console.error("Groups exception:", e);
    }

    console.log("Testing Posts query...");
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                id, image_url, content, created_at,
                profiles (nickname, avatar_url, is_private),
                likes (user_id),
                comments (id)
            `)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) {
            console.error("Posts error:", error);
        } else {
            console.log("Posts count:", data.length);
        }
    } catch (e) {
        console.error("Posts exception:", e);
    }

    console.log("Testing Reels query...");
    try {
        const { data, error } = await supabase
            .from('reels')
            .select(`
                id, video_key, thumbnail_key, title, description, created_at, views_count,
                profiles (nickname, avatar_url, is_private),
                reel_likes (user_id),
                reel_comments:comments (id)
            `)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) {
            console.error("Reels error:", error);
        } else {
            console.log("Reels count:", data.length);
        }
    } catch (e) {
        console.error("Reels exception:", e);
    }
}

test();
