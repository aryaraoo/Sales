-- Ensure conversations table has all required columns
DO $$ 
BEGIN
    -- Check if feedback column exists and is the right type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'feedback' 
        AND data_type = 'jsonb'
    ) THEN
        -- If feedback column doesn't exist, add it
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'conversations' 
            AND column_name = 'feedback'
        ) THEN
            ALTER TABLE public.conversations ADD COLUMN feedback jsonb;
        ELSE
            -- If it exists but wrong type, change it
            ALTER TABLE public.conversations ALTER COLUMN feedback TYPE jsonb USING feedback::jsonb;
        END IF;
    END IF;

    -- Check if status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated'));
    END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON public.conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_scenario_type_idx ON public.conversations(scenario_type);

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
ORDER BY ordinal_position;
