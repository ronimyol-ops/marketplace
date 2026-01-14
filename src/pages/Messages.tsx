import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AccountShell } from '@/components/account/AccountShell';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const initialConversationId = searchParams.get('c');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const getOtherUserId = (conv: Conversation) => {
    return conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
  };

  return (
    <AccountShell
      title="Messages"
      description="Chat with buyers and sellers"
    >
      <div className="grid lg:grid-cols-3 gap-6 min-h-[540px]">
        {/* Conversation List */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardContent className="p-3">
            <div className="h-[480px] lg:h-[calc(100vh-360px)] overflow-y-auto">
              <ChatList
                onSelectConversation={setSelectedConversation}
                selectedId={selectedConversation?.id}
                initialConversationId={initialConversationId}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              adId={selectedConversation.ad_id}
              adTitle={selectedConversation.ads?.title || 'Ad'}
              otherUserId={getOtherUserId(selectedConversation)}
              otherUserName={selectedConversation.otherUser?.full_name || 'User'}
              otherUserAvatar={selectedConversation.otherUser?.avatar_url || undefined}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <Card className="h-full">
              <CardContent className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Select a conversation</p>
                  <p className="text-sm">Choose from your existing conversations to start chatting.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AccountShell>
  );
}
