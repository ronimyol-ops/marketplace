import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';

interface Conversation {
  id: string;
  ad_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  ads: { title: string; slug: string } | null;
  otherUser: { full_name: string | null; avatar_url: string | null } | null;
  unreadCount: number;
  lastMessage: string | null;
}

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
  initialConversationId?: string | null;
}

export function ChatList({ onSelectConversation, selectedId, initialConversationId }: ChatListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!initialConversationId) return;
    if (selectedId === initialConversationId) return;
    const conv = conversations.find((c) => c.id === initialConversationId);
    if (conv) {
      onSelectConversation(conv);
    }
  }, [initialConversationId, conversations, selectedId, onSelectConversation]);

  const fetchConversations = async () => {
    if (!user) return;

    setIsLoading(true);
    
    const { data: convData } = await supabase
      .from('conversations')
      .select('*, ads(title, slug)')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (convData) {
      const enrichedConversations = await Promise.all(
        convData.map(async (conv) => {
          const otherUserId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
          
          // Fetch other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', otherUserId)
            .single();

          // Fetch unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('receiver_id', user.id)
            .eq('is_read', false);

          // Fetch last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            otherUser: profile,
            unreadCount: count || 0,
            lastMessage: lastMsg?.content || null
          };
        })
      );

      setConversations(enrichedConversations);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No conversations yet</p>
        <p className="text-sm">Start chatting with sellers on ads you're interested in</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <Card
          key={conv.id}
          className={`cursor-pointer transition-colors hover:bg-accent ${
            selectedId === conv.id ? 'border-primary bg-accent' : ''
          }`}
          onClick={() => onSelectConversation(conv)}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={conv.otherUser?.avatar_url || undefined} />
                <AvatarFallback>
                  {conv.otherUser?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">
                    {conv.otherUser?.full_name || 'User'}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {conv.ads?.title}
                </p>
                {conv.lastMessage && (
                  <p className="text-sm truncate mt-1">
                    {conv.lastMessage}
                  </p>
                )}
              </div>
              {conv.unreadCount > 0 && (
                <Badge className="ml-2">{conv.unreadCount}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
