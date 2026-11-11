// Subscribe using publication intent, not isSubscribed: subscription is asynchronous.
export interface CallPublication {
 source: string;
 isDesired: boolean;
 setSubscribed: (subscribed: boolean) => void;
}
export interface CallParticipant { identity: string; trackPublications: Map<string, CallPublication>; }
export function syncCallSubscriptions(participants: Iterable<CallParticipant>, visibleCameras: Set<string>) {
 for (const participant of participants) for (const publication of participant.trackPublications.values()) {
  const desired = publication.source === 'microphone' ||
   (publication.source === 'camera' && visibleCameras.has(participant.identity));
  if (publication.isDesired !== desired) publication.setSubscribed(desired);
 }
}
