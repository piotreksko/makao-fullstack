import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type RoomEvent =
  | {
      type: 'playerJoined';
      roomId: string;
      userId: string;
      displayName: string;
    }
  | { type: 'playerLeft'; roomId: string; userId: string; displayName: string }
  | { type: 'playerReady'; roomId: string; userId: string; isReady: boolean }
  | { type: 'changed'; roomId: string }
  | { type: 'started'; roomId: string };

// Lets RoomsService announce changes without knowing who listens (the gateway)
@Injectable()
export class RoomEvents {
  private readonly subject = new Subject<RoomEvent>();
  readonly events$: Observable<RoomEvent> = this.subject.asObservable();

  emit(event: RoomEvent): void {
    this.subject.next(event);
  }
}
