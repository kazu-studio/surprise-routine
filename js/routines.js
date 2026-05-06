export const ROUTINES = [
  { id: "r01", category: "健康", name: "早寝早起きする" },
  { id: "r02", category: "健康", name: "睡眠時間を推奨8時間以上、最低6時間以上とる" },
  { id: "r03", category: "健康", name: "毎日20分以上の軽い運動をしている" },
  { id: "r04", category: "健康", name: "毎日湯船入る(39〜40℃・10〜15分)" },
  {
    id: "r05",
    category: "健康",
    name: "GI値の高い炭水化物、精製された砂糖の摂取を控える（野菜と一緒に食べる）"
  },
  { id: "r06", category: "健康", name: "揚げ物の摂取を控える" },
  { id: "r07", category: "健康", name: "夕食・飲酒は寝る2時間以上前に終える" },
  { id: "r08", category: "健康", name: "仕事中は背筋を伸ばして良い姿勢を保つ" },
  { id: "r09", category: "健康", name: "毎晩デンタルフロスをする" },
  { id: "r10", category: "健康", name: "体重を測って記録する" },
  { id: "r11", category: "健康", name: "保湿して日焼け止めを塗る" },
  { id: "r12", category: "健康", name: "仕事や自己研鑽から離れてリラックスできる時間を30分以上つくる" },
  { id: "r13", category: "自己研鑽", name: "筋トレする（軽い運動でもOK）" },
  { id: "r14", category: "自己研鑽", name: "隙間時間にゴシップとショート動画を見ない" },
  { id: "r15", category: "自己研鑽", name: "毎日良かったことや新しい発見を人に話すか書き出す" },
  { id: "r16", category: "自己研鑽", name: "誰が見ても完璧なほど身だしなみを整える" },
  { id: "r17", category: "自己研鑽", name: "朝活の時間を30分以上つくる" },
  { id: "r18", category: "効率化", name: "部屋を常に整理整頓・清潔にする" },
  { id: "r19", category: "効率化", name: "中毒性があるものへの課金をやめる" },
  { id: "r20", category: "効率化", name: "承認欲を満たすためだけのSNS投稿をしない" },
  { id: "r21", category: "効率化", name: "2分以内に終わることはすぐにやる" },
  { id: "r22", category: "人間関係", name: "身近な人の話を集中して聞く" },
  { id: "r23", category: "人間関係", name: "人の良いところを見つけて伝える" },
  { id: "r24", category: "人間関係", name: "人にあったら笑顔で元気にあいさつする" },
  { id: "r25", category: "人間関係", name: "いかなる場面でも余白のある伝え方をする" },
  {
    id: "r26",
    category: "人間関係",
    name: "相手の話を聞く時に「目を見る」「うなずく」を徹底し、人の話を遮らない"
  },
  { id: "r27", category: "仕事", name: "人の話を聞く時はメモを取る" },
  {
    id: "r28",
    category: "仕事",
    name: "人からプッシュ（進捗確認）されないように自分から何をいつまでにやるかを伝える"
  },
  {
    id: "r29",
    category: "仕事",
    name: "締め切り(約束の時間)を過ぎる場合は、事前に連絡する"
  },
  {
    id: "r30",
    category: "仕事",
    name: "仕事に取り掛かる前に「ゴール」と「アウトライン」を上司や関係者に確認している"
  },
  { id: "r31", category: "仕事", name: "質問には結論から簡潔に答える" },
  { id: "r32", category: "仕事", name: "わかったふりをせず、その場で質問して解決する" }
];

export const ROUTINE_MAP = new Map(ROUTINES.map((item) => [item.id, item]));
