import { Phone } from 'lucide-react'

/**
 * EmergencyContacts Component
 * Clickable emergency phone numbers
 */
export default function EmergencyContacts() {
  const contacts = [
    { name: 'สายด่วน ปภ.', number: '1784' },
    { name: 'ตำรวจ', number: '191' },
    { name: 'แพทย์ฉุกเฉิน', number: '1669' },
    { name: 'กองทัพบก', number: '1178' },
    { name: 'ศูนย์ดำรงธรรม', number: '1567' },
  ]

  return (
    <div className="bg-slate-800 rounded-2xl p-4 text-white">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Phone className="w-5 h-5" />
        เบอร์ฉุกเฉิน (ใช้ได้แม้ offline)
      </h3>
      <div className="space-y-2">
        {contacts.map((contact, i) => (
          <a
            key={i}
            href={`tel:${contact.number}`}
            className="flex items-center justify-between p-3 bg-slate-700 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition-colors"
          >
            <span>{contact.name}</span>
            <span className="font-mono font-bold text-green-400">{contact.number}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
