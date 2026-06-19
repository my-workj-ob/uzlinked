const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elrcutboltuhrqockkrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscmN1dGJvbHR1aHJxb2Nra3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUzOTc1NSwiZXhwIjoyMDk3MTE1NzU1fQ.R41NNYLPBpvqtNOvbKwPy1HjNniACR2HegMA9MJJp7U'; // service_role_key

const supabase = createClient(supabaseUrl, supabaseKey);

const coderId = '0673edec-b3cf-4e4a-8f2e-56d1b482ba60';
const baxtiyorId = 'c26efb31-eadc-4398-b678-6b9672028e19';

async function testToggle() {
  console.log('Checking existing follow...');
  const { data: existing, error: findError } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', coderId)
    .eq('following_id', baxtiyorId)
    .maybeSingle();

  if (findError) {
    console.error('Find error:', findError);
    return;
  }

  console.log('Existing:', existing);

  if (existing) {
    console.log('Deleting follow...');
    const { data: delData, error: delError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', coderId)
      .eq('following_id', baxtiyorId)
      .select();

    if (delError) {
      console.error('Delete error:', delError);
    } else {
      console.log('Delete success:', delData);
    }
  } else {
    console.log('Inserting follow...');
    const { data: insData, error: insError } = await supabase
      .from('follows')
      .insert({ follower_id: coderId, following_id: baxtiyorId })
      .select();

    if (insError) {
      console.error('Insert error:', insError);
    } else {
      console.log('Insert success:', insData);
    }
  }
}

testToggle();
