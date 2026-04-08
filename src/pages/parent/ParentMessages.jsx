import DirectMessagingPanel from "@/components/messaging/DirectMessagingPanel";

export default function ParentMessages() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Communicate with teachers from one place
        </p>
      </div>

      <DirectMessagingPanel
        emptyHint="No conversations yet. Use the dropdown to message a teacher."
        newRecipientLabel="Message a teacher"
      />
    </div>
  );
}
