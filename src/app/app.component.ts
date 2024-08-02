import { Component, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import {IconService, PlacedIcon} from "../services/icon.service";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild('imageCanvas') canvasElement!: ElementRef<HTMLCanvasElement>;
  private canvasContext!: CanvasRenderingContext2D;
  private selectedIcon: string = '';
  public iconSize: number = 50;  // Default icon size for new icons
  private placedIcons: Array<{ x: number, y: number, img: HTMLImageElement, size: number }> = [];
  private backgroundImage: HTMLImageElement = new Image();
  private scale: number = 1;  // Default scale (100% zoom)
  private canvasWidth = 800;
  private canvasHeight = 600;
  private translateX = 0;
  private translateY = 0;
  private isPanning = false;
  private startX = 0;
  private startY = 0;
  private isRemoving = false;
  private isAnnotating = false;
  private hoverIcon: HTMLImageElement | null = null;
  private mouseX = 0;
  private mouseY = 0;
  constructor(private iconService: IconService) {}

  ngAfterViewInit() {
    this.canvasContext = this.canvasElement.nativeElement.getContext('2d')!;
    this.setCanvasSize();
    window.addEventListener('resize', this.setCanvasSize.bind(this));

    this.backgroundImage.src = 'assets/car-image.png';
    this.backgroundImage.onload = () => {
      this.redrawCanvas();
    };

    const canvas = this.canvasElement.nativeElement;
    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      if (this.isRemoving) {
        this.removeIcon(event.clientX - rect.left, event.clientY - rect.top);
      } else if (this.isAnnotating && this.hoverIcon) {
        const x = (event.clientX - rect.left - this.translateX) / this.scale;
        const y = (event.clientY - rect.top - this.translateY) / this.scale;
        this.addIcon(x, y);
      }
    });

    canvas.addEventListener('mousedown', this.startPan.bind(this));
    canvas.addEventListener('mousemove', this.pan.bind(this));
    canvas.addEventListener('mouseup', this.endPan.bind(this));
    canvas.addEventListener('wheel', this.handleWheel.bind(this));
  }

  savePlacedIcons() {
    const dataToSend: PlacedIcon[] = this.placedIcons.map(icon => ({
      x: icon.x,
      y: icon.y,
      size: icon.size,
      imgSrc: icon.img.src  // Extract img.src from HTMLImageElement
    }));

    this.iconService.savePlacedIcons(dataToSend).subscribe(
      (response: any) => {
        console.log('Icons saved successfully!', response);
        const sessionId = response.SessionId;
        console.log('Session ID:', sessionId);
      },
      error => {
        console.error('Error saving icons!', error);
      }
    );
  }

  fetchPlacedIcons(sessionId: string) {
    this.iconService.fetchPlacedIcons(sessionId).subscribe(
      (icons: PlacedIcon[]) => {
        // Reconstruct the placedIcons array with HTMLImageElement, discarding imgSrc
        this.placedIcons = icons.map(icon => {
          const imgElement = new Image();
          imgElement.src = icon.imgSrc;
          imgElement.onload = () => this.redrawCanvas();

          return {
            x: icon.x,
            y: icon.y,
            size: icon.size,
            img: imgElement  // Only include properties needed for rendering
          };
        });
      },
      error => {
        console.error('Error fetching icons!', error);
      }
    );
  }

  setCanvasSize() {
    const containerWidth = window.innerWidth * 0.9;  // 90% of the window width
    const containerHeight = window.innerHeight * 0.7;  // 70% of the window height

    // Calculate aspect ratio
    const aspectRatio = this.canvasWidth / this.canvasHeight;

    // Adjust canvas size while maintaining aspect ratio
    if (containerWidth / aspectRatio <= containerHeight) {
      this.canvasWidth = containerWidth;
      this.canvasHeight = containerWidth / aspectRatio;
    } else {
      this.canvasHeight = containerHeight;
      this.canvasWidth = containerHeight * aspectRatio;
    }

    const canvas = this.canvasElement.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    this.redrawCanvas();
  }

  @HostListener('document:keydown.shift', ['$event'])
  onShiftKeyDown(event: KeyboardEvent) {
    this.isRemoving = true;
  }

  @HostListener('document:keyup.shift', ['$event'])
  onShiftKeyUp(event: KeyboardEvent) {
    this.isRemoving = false;
  }

  @HostListener('document:keydown.esc', ['$event'])
  onEscKeyDown(event: KeyboardEvent) {
    this.deselectIcon();
    this.redrawCanvas(); // Ensure canvas is refreshed without hover icon
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const rect = this.canvasElement.nativeElement.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
    if (this.isAnnotating && this.hoverIcon) {
      this.redrawCanvas();  // Redraw to show hover icon
    }
  }

  startPan(event: MouseEvent) {
    if (!this.isAnnotating && !this.isRemoving) {
      this.isPanning = true;
      this.startX = event.clientX - this.translateX;
      this.startY = event.clientY - this.translateY;
    }
  }

  pan(event: MouseEvent) {
    if (this.isPanning) {
      this.translateX = event.clientX - this.startX;
      this.translateY = event.clientY - this.startY;
      this.redrawCanvas();
    }
  }

  endPan() {
    this.isPanning = false;
  }

  handleWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const oldScale = this.scale;
    const rect = this.canvasElement.nativeElement.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - this.translateX) / oldScale;
    const mouseY = (event.clientY - rect.top - this.translateY) / oldScale;

    if (event.deltaY < 0) {
      this.scale *= (1 + zoomSpeed); // Zoom in
    } else if (event.deltaY > 0) {
      this.scale *= (1 - zoomSpeed); // Zoom out
    }

    this.scale = Math.max(0.1, Math.min(5, this.scale));
    this.translateX -= mouseX * (this.scale - oldScale);
    this.translateY -= mouseY * (this.scale - oldScale);
    this.redrawCanvas();
  }

  selectIcon(iconPath: string) {
    this.selectedIcon = iconPath;
    this.isAnnotating = true;
    this.hoverIcon = new Image();
    this.hoverIcon.src = iconPath;
    this.isRemoving = false; // Ensure removing mode is off
  }

  increaseIconSize() {
    this.iconSize += 5;
  }

  decreaseIconSize() {
    if (this.iconSize > 10) {
      this.iconSize -= 5;
    }
  }

  setIconSize(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const size = inputElement.valueAsNumber;
    if (size >= 10) {
      this.iconSize = size;
    }
  }

  addIcon(x: number, y: number) {
    if (this.hoverIcon) {
      this.placedIcons.push({ x, y, img: this.hoverIcon, size: this.iconSize });
      this.redrawCanvas();
    }
  }

  removeIcon(clickX: number, clickY: number) {
    for (let i = this.placedIcons.length - 1; i >= 0; i--) {
      const icon = this.placedIcons[i];
      const iconX = icon.x * this.scale + this.translateX;
      const iconY = icon.y * this.scale + this.translateY;
      const scaledIconSize = icon.size * this.scale;
      if (
        clickX >= iconX - scaledIconSize / 2 &&
        clickX <= iconX + scaledIconSize / 2 &&
        clickY >= iconY - scaledIconSize / 2 &&
        clickY <= iconY + scaledIconSize / 2
      ) {
        this.placedIcons.splice(i, 1);
        this.redrawCanvas();
        break;
      }
    }
  }

  redrawCanvas() {
    const canvas = this.canvasElement.nativeElement;
    this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    this.canvasContext.save();
    this.canvasContext.translate(this.translateX, this.translateY);
    this.canvasContext.scale(this.scale, this.scale);
    this.canvasContext.drawImage(this.backgroundImage, 0, 0, this.canvasWidth, this.canvasHeight);
    this.canvasContext.restore();

    this.placedIcons.forEach(icon => {
      const scaledIconSize = icon.size * this.scale;
      const x = icon.x * this.scale + this.translateX - scaledIconSize / 2;
      const y = icon.y * this.scale + this.translateY - scaledIconSize / 2;
      this.canvasContext.drawImage(icon.img, x, y, scaledIconSize, scaledIconSize);
    });

    if (this.isAnnotating && this.hoverIcon) {
      const scaledIconSize = this.iconSize * this.scale;
      const x = this.mouseX - scaledIconSize / 2;
      const y = this.mouseY - scaledIconSize / 2;
      this.canvasContext.drawImage(this.hoverIcon, x, y, scaledIconSize, scaledIconSize);
    }
  }

  downloadImage() {
    const canvas = this.canvasElement.nativeElement;
    const context = this.canvasContext;

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this.backgroundImage, 0, 0, this.canvasWidth, this.canvasHeight);

    this.placedIcons.forEach(icon => {
      const imgSize = icon.size;
      context.drawImage(icon.img, icon.x - imgSize / 2, icon.y - imgSize / 2, imgSize, imgSize);
    });

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'annotated-image.png';
    link.click();

    context.restore();
    this.redrawCanvas();
  }

  deselectIcon() {
    this.selectedIcon = '';
    this.isAnnotating = false;
    this.hoverIcon = null;
  }
}
