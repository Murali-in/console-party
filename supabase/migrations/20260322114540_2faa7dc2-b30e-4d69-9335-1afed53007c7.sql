
ALTER TABLE public.approved_games
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS github_url text,
ADD COLUMN IF NOT EXISTS engine text NOT NULL DEFAULT 'phaser';

UPDATE public.approved_games
SET source_url = 'https://tosios.online',
    github_url = 'https://github.com/halftheopposite/TOSIOS',
    engine = 'iframe'
WHERE title = 'TOSIOS';

UPDATE public.approved_games
SET source_url = 'https://kaetram.com',
    github_url = 'https://github.com/Kaetram/Kaetram-Open',
    engine = 'iframe'
WHERE title = 'Kaetram';
