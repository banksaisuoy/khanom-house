import { FileText } from 'lucide-react'
import { PlaceholderCard } from '@/components/admin/placeholder-card'

// Optional full-page editor placeholder. The dialog is the primary
// editor; this route exists so deep links like /admin/blog/<id> work
// without 404. It redirects intent back to the main blog table.
export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  void id
  return (
    <PlaceholderCard
      title="แก้ไขบทความ"
      description="ใช้ตารางในหน้า Blog หลักเพื่อแก้ไขบทความ (คลิกที่ปุ่มดินสอในแถว)"
      icon={FileText}
      backHref="/admin/blog"
      backLabel="กลับไปหน้า Blog"
    />
  )
}
