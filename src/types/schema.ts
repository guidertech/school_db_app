export interface Presentation {
  id?: number;
  created_at?: string;
  topic_name: string;
  topic_category: string;
  link: string;
  topic_id: number;
  tags: string[];
}

export interface Slide {
  id?: number;
  created_at?: string;
  image: string;
  video: string;
  slide_no: number;
  topic_id: number;
}
