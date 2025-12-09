import EmergencyChecklist from '../components/EmergencyChecklist'
import SafetyInstructions from '../components/SafetyInstructions'
import WeakPointsGuide from '../components/WeakPointsGuide'
import FakeNewsGuide from '../components/FakeNewsGuide'
import EmergencyContacts from '../components/EmergencyContacts'
import SelfDefenseGuide from '../components/SelfDefenseGuide'
import FirstAidGuide from '../components/FirstAidGuide'

/**
 * GuideTab Page
 * Emergency preparedness guides and resources
 */
export default function GuideTab() {
  return (
    <div className="space-y-4">
      {/* 72-Hour Emergency Checklist */}
      <EmergencyChecklist />

      {/* Safety Instructions */}
      <SafetyInstructions />

      {/* Self Defense Guide - NEW */}
      <SelfDefenseGuide />

      {/* First Aid Guide - NEW */}
      <FirstAidGuide />

      {/* Weak Points in Home */}
      <WeakPointsGuide />

      {/* Fake News Guide */}
      <FakeNewsGuide />

      {/* Emergency Contacts */}
      <EmergencyContacts />
    </div>
  )
}
