import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigration() {
  console.log('Running database migration...')
  
  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'db', 'migrations', '001_init.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        console.log(`SQL: ${statement.substring(0, 100)}...`)
        
        const { error } = await supabase.rpc('exec', { sql: statement })
        
        if (error) {
          console.error(`Statement ${i + 1} failed:`, error)
          // Continue with other statements
        } else {
          console.log(`Statement ${i + 1} completed successfully`)
        }
      }
    }
    
    console.log('Migration completed!')
  } catch (error) {
    console.error('Error running migration:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  runMigration()
}

export { runMigration }
