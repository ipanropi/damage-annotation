// src/app/services/icon.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {HttpClient} from "@angular/common/http";

// src/app/services/icon.service.ts
export interface PlacedIcon {
  x: number;
  y: number;
  size: number;
  imgSrc: string;
}

@Injectable({
  providedIn: 'root'
})
export class IconService {
  private apiUrl = 'https://your-backend-url/api';  // Replace with your backend URL

  constructor(private http: HttpClient) { }

  savePlacedIcons(placedIcons: PlacedIcon[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/save-icons`, { placedIcons });
  }

  fetchPlacedIcons(sessionId: string): Observable<PlacedIcon[]> {
    return this.http.get<PlacedIcon[]>(`${this.apiUrl}/get-icons/${sessionId}`);
  }
}

