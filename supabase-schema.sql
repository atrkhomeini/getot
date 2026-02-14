-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'user')),
  avatar_color VARCHAR(7) NOT NULL DEFAULT '#FF6B6B',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('back', 'legs', 'chest', 'shoulder')),
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 12,
  gif_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_logs table
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  actual_sets INTEGER NOT NULL,
  actual_reps INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create check_ins table
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX idx_workout_logs_date ON workout_logs(date);
CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX idx_check_ins_date ON check_ins(check_in_time);
CREATE INDEX idx_exercises_category ON exercises(category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for exercises table
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default owner account (password: admin123)
INSERT INTO users (name, password, role, avatar_color)
VALUES ('Owner', 'admin123', 'owner', '#4ECDC4');

-- Insert default exercises with placeholder GIF URLs
INSERT INTO exercises (name, category, target_sets, target_reps, gif_url) VALUES
-- Back exercises
('Lat Pulldown', 'back', 3, 12, 'https://v2.exercisedb.io/image/LatPulldown.gif'),
('Rowing', 'back', 3, 10, 'https://v2.exercisedb.io/image/Rowing.gif'),
('Back-up Machine', 'back', 3, 12, 'https://v2.exercisedb.io/image/BackMachine.gif'),
-- Leg exercises
('Barbell Squat', 'legs', 4, 10, 'https://v2.exercisedb.io/image/Squat.gif'),
('Hack Squat', 'legs', 3, 12, 'https://v2.exercisedb.io/image/HackSquat.gif'),
('Hamstring Curl', 'legs', 3, 12, 'https://v2.exercisedb.io/image/HamstringCurl.gif'),
-- Chest exercises
('Incline Press', 'chest', 4, 10, 'https://v2.exercisedb.io/image/InclinePress.gif'),
('Chest Fly', 'chest', 3, 12, 'https://v2.exercisedb.io/image/ChestFly.gif'),
('Dips', 'chest', 3, 10, 'https://v2.exercisedb.io/image/Dips.gif'),
-- Shoulder exercises
('Shoulder Press', 'shoulder', 4, 10, 'https://v2.exercisedb.io/image/ShoulderPress.gif'),
('Lateral Raise', 'shoulder', 3, 12, 'https://v2.exercisedb.io/image/LateralRaise.gif'),
('Reverse Peck Deck', 'shoulder', 3, 12, 'https://v2.exercisedb.io/image/PeckDeck.gif'),
('Dumbbell Rear Delt', 'shoulder', 3, 12, 'https://v2.exercisedb.io/image/RearDelt.gif');
