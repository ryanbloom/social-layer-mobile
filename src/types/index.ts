// Port from Next.js type definitions with React Native adaptations

export interface SocialMedia {
  twitter: string | null;
  github: string | null;
  discord: string | null;
  ens: string | null;
  lens: string | null;
  nostr: string | null;
  website: string | null;
  farcaster: string | null;
  telegram: string | null;
}

export interface Profile {
  id: number;
  handle: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  zupass: string | null;
  status: 'active' | 'freezed';
  image_url: string | null;
  nickname: string | null;
  about: string | null;
  location: string | null;
  sol_address: string | null;
  farcaster_fid: string | null;
  farcaster_address: string | null;
  extras: string;
  permissions: string;
  social_links: SocialMedia;
}

export type ProfileSample = Pick<
  Profile,
  'id' | 'handle' | 'nickname' | 'image_url'
>;

export interface Event {
  id: number;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  timezone: string;
  meeting_url: string | null;
  location: string | null;
  formatted_address: string | null;
  geo_lat: string | null;
  geo_lng: string | null;
  cover_url: string | null;
  content: string | null;
  tags: string[] | null;
  max_participant: number | null;
  min_participant: number | null;
  participants_count: number;
  badge_class_id: number | null;
  external_url: string | null;
  notes: string | null;
  host_info: {
    speaker?: ProfileSample[];
    co_host?: ProfileSample[];
    group_host?: ProfileSample[];
  } | null;
  venue: string | null;
  group_id?: number;
  group: ProfileSample;
  tickets: Ticket[] | null;
  owner: ProfileSample;
  event_roles: EventRole[] | null;
  location_data: string | null;
  status: string | null;
  track_id: number | null;
  venue_id: number | null;
  display: string | null;
  pinned: boolean;
  participants: Participant[] | null;
}

export interface EventWithJoinStatus extends Event {
  is_owner: boolean;
  is_attending: boolean;
  is_starred: boolean;
  track?: Track;
}

export interface PaymentMethod {
  id?: number;
  item_type: string;
  item_id?: number;
  chain: string;
  token_name: null | string;
  token_address: null | string;
  receiver_address: null | string;
  price: number;
  protocol: string;
  _destroy?: string;
}

export interface Ticket {
  tracks_allowed: null | number[];
  id: number;
  check_badge_class_id: number | null;
  check_badge_class: BadgeClass | null;
  content: string;
  created_at: string;
  end_time: string | null;
  event_id: number;
  need_approval: boolean;
  payment_chain: string | null;
  payment_target_address: string | null;
  payment_token_address: string | null;
  payment_token_price: string | null;
  payment_token_name: string | null;
  quantity: number | null;
  status: string;
  title: string;
  payment_metadata: {
    payment_chain: string | null;
    payment_target_address: string | null;
    payment_token_address: string | null;
    payment_token_price: string | null;
    payment_token_name: string | null;
  }[];
  payment_methods: PaymentMethod[];
  payment_methods_attributes: PaymentMethod[];
  ticket_type: string;
}

export interface Track {
  tag: string;
  id: number;
  title: string;
  about: string | null;
  start_date: string | null;
  end_date: string | null;
  icon_url: string | null;
}

export enum EventRoleType {
  Speaker = 'speaker',
  CoHost = 'co_host',
  GroupHost = 'group_host',
  CustomHost = 'custom_host',
}

export interface EventRole {
  id?: number;
  event_id?: number | null;
  item_id: number | null;
  email?: string | null;
  nickname: string | null;
  image_url: string | null;
  role: EventRoleType;
  profile?: ProfileSample;
  group?: GroupSample;
  item_type: 'Profile' | 'Group';
  _destroy?: string;
}

export interface Group {
  id: number;
  handle: string;
  nickname: string | null;
  image_url: string | null;
  about: string | null;
  social_links: SocialMedia;
  location: string | null;
  permissions: string[];
  status: string | null;
  event_tags: string[] | null;
  event_enabled: boolean;
  can_publish_event: string;
  can_join_event: string;
  can_view_event: string;
  map_enabled: boolean;
  banner_link_url: string | null;
  banner_image_url: string | null;
  banner_text: string | null;
  logo_url: string | null;
  memberships_count: number;
  events_count: number;
  group_tags: string[] | null;
  timezone: string | null;
  main_event_id: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Membership {
  id: number;
  role: string;
  profile: ProfileSample;
}

export type GroupSample = Pick<
  Group,
  'id' | 'handle' | 'nickname' | 'image_url'
>;

export interface BadgeClass {
  id: number;
  title: string;
  creator_id: number;
  image_url: string | null;
  metadata: string | null;
  content: string | null;
  group_id: number | null;
  transferable: null | boolean;
  badge_type: string | null;
  permissions: string[] | null;
  created_at: string;
  display: string | null;
  can_send_badge: string;
  creator: ProfileSample;
  counter: number;
}

export interface Badge {
  id: number;
  image_url: string | null;
  title: string;
  creator_id: number;
  owner_id: number;
  metadata: string | null;
  content: string | null;
  display: string | null;
  value: string | null;
  created_at: string;
  badge_class: BadgeClass;
  creator: ProfileSample;
  owner: ProfileSample;
}

export interface Participant {
  id: number;
  event_id: number;
  profile_id: number;
  role: string;
  status: string | null;
  created_at: string | null;
  ticket_id: number | null;
  payment_status: string | null;
  event: Event;
  profile: ProfileSample;
  ticket: Ticket | null;
  ticket_item?: {
    status: string;
    sender_address: string;
  };
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  EventDetail: { eventId: number };
  Participants: { eventId: number };
  Profile: { handle: string };
  CreateEvent: undefined;
  Auth: undefined;
};

export type TabParamList = {
  Discover: undefined;
  Search: undefined;
  Calendar: undefined;
  MyEvents: undefined;
  Profile: undefined;
};
