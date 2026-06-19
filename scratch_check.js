const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elrcutboltuhrqockkrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscmN1dGJvbHR1aHJxb2Nra3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUzOTc1NSwiZXhwIjoyMDk3MTE1NzU1fQ.R41NNYLPBpvqtNOvbKwPy1HjNniACR2HegMA9MJJp7U'; // service_role_key

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- PROFILES ---');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, username, nickname, is_private');
  
  if (pError) console.error(pError);
  else console.log(profiles);

  console.log('--- FOLLOWS ---');
  const { data: follows, error: fError } = await supabase
    .from('follows')
    .select('*');

  if (fError) console.error(fError);
  else console.log(follows);
}

check();
