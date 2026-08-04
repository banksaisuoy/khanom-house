import { db } from '@/lib/db'
import { RecipesClient } from '@/components/admin/recipes/recipes-client'

export const dynamic = 'force-dynamic'

export default async function AdminRecipesPage() {
  return <RecipesClient />
}
